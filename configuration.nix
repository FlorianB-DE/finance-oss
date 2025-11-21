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

  finances-tarball = pkgs.fetchzip {
    url = "https://github.com/florianb-de/finance-oss/releases/download/${version}/finances-build.tar.gz";
    hash = "sha256-29dhHLO3h62mqr+OX0Q2R9kBntj5YfrmcpOh1Z1OtfQ=";
    stripRoot = false;
  };

  # Create a derivation that sets up the application structure
  # This extracts everything and sets up Prisma runtime in the Nix store
  finances-app = pkgs.stdenv.mkDerivation {
    name = "finances-app-${version}";
    src = finances-tarball;

    # fetchzip already unpacks, so we work directly from $src
    dontUnpack = true;

    # Install phase: set up the final structure
    installPhase = ''
      mkdir -p $out
      
      # Copy build output
      cp -r $src/build $out/
      
      # Copy prisma schema
      cp -r $src/prisma $out/
      
      # Copy package.json and bun.lock (for reference, not needed at runtime)
      cp $src/package.json $out/
      cp $src/bun.lock $out/ 2>/dev/null || true
      
      # Copy Prisma runtime (needed due to https://github.com/prisma/prisma/issues/28471)
      # The generated client requires @prisma/client/runtime but it's not bundled by default
      if [ -d $src/node_modules/@prisma/client/runtime ]; then
        mkdir -p $out/node_modules/@prisma/client
        cp -r $src/node_modules/@prisma/client/runtime $out/node_modules/@prisma/client/
      fi
    '';

    # Don't fixup to avoid issues with node_modules
    dontFixup = true;
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
    #      SYSTEMD CONFIG
    # -------------------------
    serviceConfig = {
      Type = "simple";
      Restart = "on-failure";

      # NixOS-managed writable directories
      StateDirectory  = "finances";       # /var/lib/finances
      CacheDirectory  = "finances";       # /var/cache/finances

      # Prisma migrations (use system Prisma CLI)
      ExecStartPre = [
        "${pkgs.prisma}/bin/prisma migrate deploy --schema ${finances-app}/prisma/schema.prisma"
      ];

      ExecStart = "${bun}/bin/bun ${finances-app}/build/index.js";

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
