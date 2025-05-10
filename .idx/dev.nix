{pkgs}: {
  # Which nixpkgs channel to use.
  channel = "stable-24.11"; # or "unstable"
  packages = [
    pkgs.nodejs_20
    pkgs.zulu
  ];
  # Sets environment variables in the workspace
  env = {};
  idx = {
    extensions = [
      # "vscodevim.vim"
    ];
    workspace = {
      onCreate = {
        default.openFiles = [
          "src/app/page.tsx"
        ];
      };
    };
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
