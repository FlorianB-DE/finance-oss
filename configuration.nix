{
  modulesPath,
  pkgs,
  ...
}: let
  hostname = "finances";

  timeZone = "Berlin/Berlin";
  defaultLocale = "de_DE.UTF-8";

  bun = pkgs.bun;
  version = "2025-11-21_14-47-12";

  finances-app = pkgs.fetchzip {
    url = "https://github.com/florianb-de/finance-oss/releases/download/${version}/finances-build.tar.gz";
    hash = "sha256-29dhHLO3h62mqr+OX0Q2R9kBntj5YfrmcpOh1Z1OtfQ=";
    stripRoot = false;
  };

in {
  imports = [];

  networking.hostName = hostname;

  environment.systemPackages = with pkgs; [
    bun
    ungoogled-chromium
    git
    openssl
    prisma
    sqlite
  ];

  systemd.services.finances = {
    enable = true;
    description = "Finances SvelteKit service";

    # Make rsync available
    path = [ pkgs.rsync ];

    wantedBy = [ "multi-user.target" ];
    after = [ "network.target" ];
    requires = [ "network.target" ];

    # -------------------------
    #      ENVIRONMENT
    # -------------------------
    environment = {
      NODE_ENV = "production";
      PORT = "3000";
      DATABASE_URL = "file:/var/lib/finances/db.sqlite";
      PUPPETEER_EXECUTABLE_PATH = "${pkgs.ungoogled-chromium}/bin/chromium-browser";
      FILES_DIR="/var/cache/finances";

      # IMPORTANT: Do not let Bun re-install packages into a cache
      BUN_INSTALL_CACHE_DIR = "/var/cache/finances/bun-install";

      # Bun runtime cache is OK
      BUN_RUNTIME_CACHE_DIR = "/var/cache/finances/bun-runtime";

      # systemd-managed runtime directory
      TMPDIR = "/run/finances/tmp";

      # also good practice to set this:
      XDG_CACHE_HOME = "/var/cache/finances";
    };

    # -------------------------
    #      PREPARE DIRS
    # -------------------------
    preStart = ''
      # copy build to writable place to avoid Bun writing into /nix/store
      rsync -a --delete ${finances-app}/build/ /var/lib/finances/server/

      # copy package.json and prisma schema (needed for migrations)
      cp ${finances-app}/package.json /var/lib/finances/server/
      cp -r ${finances-app}/prisma /var/lib/finances/server/

      # Generate Prisma client in the server directory
      # This ensures the client is generated for the correct platform
      cd /var/lib/finances/server
      ${pkgs.prisma}/bin/prisma generate --schema ./prisma/schema.prisma

      # ensure tmp exists inside systemd RuntimeDirectory
      mkdir -p /run/finances/tmp
      chmod 700 /run/finances/tmp
    '';

    # -------------------------
    #      SYSTEMD CONFIG
    # -------------------------
    serviceConfig = {
      Type = "simple";
      Restart = "on-failure";

      # NixOS-managed writable directories
      StateDirectory  = [ "finances" "finances/server" ];     # /var/lib/finances, /var/lib/finances/server
      CacheDirectory  = "finances";       # /var/cache/finances
      RuntimeDirectory = "finances/tmp";  # /run/finances/tmp

      # where server actually runs
      WorkingDirectory = "/var/lib/finances/server";

      # Prisma migrations
      ExecStartPre = [
        "${pkgs.prisma}/bin/prisma migrate deploy --schema /var/lib/finances/server/prisma/schema.prisma"
      ];

      ExecStart = "${bun}/bin/bun /var/lib/finances/server/index.js";

      DynamicUser = true;
    };
  };

  networking.firewall.allowedTCPPorts = [ 3000 ];

  time.timeZone = timeZone;

  i18n = {
    defaultLocale = defaultLocale;
    extraLocaleSettings = {
      LC_ADDRESS = defaultLocale;
      LC_IDENTIFICATION = defaultLocale;
      LC_MEASUREMENT = defaultLocale;
      LC_MONETARY = defaultLocale;
      LC_NAME = defaultLocale;
      LC_NUMERIC = defaultLocale;
      LC_PAPER = defaultLocale;
      LC_TELEPHONE = defaultLocale;
      LC_TIME = defaultLocale;
    };
  };

  systemd.suppressedSystemUnits = [
    "dev-mqueue.mount"
    "sys-kernel-debug.mount"
    "sys-fs-fuse-connections.mount"
  ];

  system.stateVersion = "24.11";
}
