{
  description = "Dev environment for Angular + NestJS project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [
          pkgs.nodejs_22
          pkgs.pnpm
          pkgs.git
        ];

        # Optional: env vars shared across web/ and server/
        # shellHook = ''
        #   echo "Welcome to the dev shell 🚀"
        #   export NODE_ENV=development
        # '';
      };
    };
}
