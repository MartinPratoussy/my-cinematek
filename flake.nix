{
  description = "my-cinematek film journal";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      packageFor = pkgs:
        let
          python = pkgs.python3.withPackages (packages: [ packages.psycopg ]);
          appFiles = pkgs.stdenvNoCC.mkDerivation {
            pname = "my-cinematek-files";
            version = "1.0.0";
            src = self;
            dontBuild = true;
            installPhase = ''
              mkdir -p "$out/share/my-cinematek"
              cp server.py index.html admin.html app.js admin.js public.js styles.css "$out/share/my-cinematek/"
            '';
          };
        in
        pkgs.writeShellApplication {
          name = "my-cinematek";
          runtimeInputs = [ python ];
          text = ''
            export SQLITE_PATH="''${SQLITE_PATH:-''${XDG_DATA_HOME:-$HOME/.local/share}/my-cinematek/my-cinematek.db}"
            mkdir -p "$(dirname "$SQLITE_PATH")"
            cd "${appFiles}/share/my-cinematek"
            exec python server.py
          '';
        };
    in
    {
      packages = forAllSystems (system: {
        default = packageFor (import nixpkgs { inherit system; });
      });

      nixosModules.default = { config, lib, pkgs, ... }:
        let
          cfg = config.services.my-cinematek;
        in
        {
          options.services.my-cinematek = {
            enable = lib.mkEnableOption "my-cinematek";
            package = lib.mkOption {
              type = lib.types.package;
              default = packageFor pkgs;
              description = "The my-cinematek package to run.";
            };
            port = lib.mkOption {
              type = lib.types.port;
              default = 8000;
              description = "TCP port listened to by my-cinematek.";
            };
            environmentFile = lib.mkOption {
              type = lib.types.nullOr lib.types.str;
              default = null;
              description = "Root-managed file containing AUTHOR_PASSWORD and optional integration settings.";
            };
          };

          config = lib.mkIf cfg.enable {
            assertions = [
              {
                assertion = cfg.environmentFile != null;
                message = "services.my-cinematek.environmentFile must provide AUTHOR_PASSWORD and the app's integration settings.";
              }
            ];
            systemd.services.my-cinematek = {
              description = "my-cinematek film journal";
              wantedBy = [ "multi-user.target" ];
              wants = [ "network-online.target" ];
              after = [ "network-online.target" ];
              serviceConfig = {
                ExecStart = "${cfg.package}/bin/my-cinematek";
                Restart = "on-failure";
                RestartSec = "10s";
                DynamicUser = true;
                StateDirectory = "my-cinematek";
                StateDirectoryMode = "0700";
                ProtectHome = true;
                ProtectSystem = "strict";
                PrivateTmp = true;
                NoNewPrivileges = true;
                Environment = [
                  "PORT=${toString cfg.port}"
                  "SQLITE_PATH=/var/lib/my-cinematek/my-cinematek.db"
                ];
              } // lib.optionalAttrs (cfg.environmentFile != null) {
                EnvironmentFile = cfg.environmentFile;
              };
            };
          };
        };
    };
}