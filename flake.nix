{
  description = "Dev environment for Angular + NestJS project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
    in
    {
      devShells = builtins.listToAttrs (
        map (
          system:
          let
            pkgs = import nixpkgs { inherit system; };
          in
          {
            name = system;
            value = {
              default = pkgs.mkShell {
                buildInputs = [
                  pkgs.nodejs_22
                  pkgs.pnpm
                  pkgs.git
                ];

                shellHook = ''
                  echo "Welcome to the Angular dev shell 🚀"
                  export NODE_ENV=development
                '';
              };
            };
          }
        ) systems
      );
    };
}
