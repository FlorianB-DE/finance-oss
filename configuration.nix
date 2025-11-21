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
    prisma-engines
    sqlite
  ];

  systemd.services.finances = {
    enable = true;
    description = "Finances SvelteKit service";

    # Make rsync and bun available for preStart
    path = [ pkgs.rsync pkgs.bun ];

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

      # Use system Prisma engines instead of downloading them
      PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
      PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";
      PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
      PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.node";
      PRISMA_FMT_BINARY = "${pkgs.prisma-engines}/bin/prisma-fmt";
    };

    # -------------------------
    #      PREPARE DIRS
    # -------------------------
    preStart = ''
      # Copy from Nix store to writable location
      rsync -a --delete ${finances-app}/build/ /var/lib/finances/server/
      rsync -a --delete ${finances-app}/prisma/ /var/lib/finances/prisma/

      # Install @prisma/client (needed for TypeScript types and client code)
      # Prisma engines come from system packages via environment variables
      cd /var/lib/private/finances/server
      ${bun}/bin/bun install --frozen-lockfile --production --no-save @prisma/client
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

      # where server actually runs
      WorkingDirectory = "/var/lib/finances/server";

      # Prisma migrations (use system Prisma CLI)
      ExecStartPre = [
        "${pkgs.prisma}/bin/prisma migrate deploy --schema /var/lib/finances/prisma/schema.prisma"
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
