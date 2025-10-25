{
  description = "Basic dev environment for Angular/NestJS project";

  outputs =
    { nixpkgs, ... }:
    let
      supportedSystems = [
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            buildInputs = [
              pkgs.nodejs_22
              pkgs.pnpm
              pkgs.git
            ];

            shellHook = ''
              export NODE_ENV=development
            '';
          };
        }
      );
    };
}
