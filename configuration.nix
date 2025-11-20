{ config, pkgs, lib, ... }:

let
  bun = pkgs.bun;
  version = "v0.0.1";
  finances-app = pkgs.fetchzip {
    url = "https://github.com/florianb-de/finance-oss/releases/download/${version}/finances-build.tar.gz";
    hash = lib.fakeSha256;
    stripRoot = false;
  };
in
{
  imports = [ ];

  nixpkgs.hostPlatform = lib.mkDefault "x86_64-linux";
  system.stateVersion = "24.11";

  environment.systemPackages = with pkgs; [
    bun
    git
    openssl
    sqlite
  ];

  services.finances = {
    description = "Finances SvelteKit service";
    wantedBy = [ "multi-user.target" ];
    after = [ "network-online.target" ];
    requires = [ "network-online.target" ];

    environment = {
      NODE_ENV = "production";
      PORT = "3000";
      DATABASE_URL = "/var/lib/finances/db.sqlite";
    };

    serviceConfig = {
      Type = "simple";
      Restart = "on-failure";
      RuntimeDirectory = "finances";
      WorkingDirectory = "${finances-app}";
      ExecStartPre = [
        "${bun}/bin/bunx puppeteer browsers install chrome-headless-shell"
        "${bun}/bin/bunx prisma migrate deploy --schema ${finances-app}/prisma/schema.prisma"
      ];
      ExecStart = "${bun}/bin/bun ${finances-app}/build/index.js";
      DynamicUser = true;
      StateDirectory = "finances";
    };
  };

  networking.firewall.allowedTCPPorts = [ 3000 ];
}

