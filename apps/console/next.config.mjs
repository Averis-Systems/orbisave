/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @orbisave/admin-ui ships raw TSX (no build step); Next compiles it.
  transpilePackages: ['@orbisave/admin-ui'],
  webpack: (config) => {
    // The package arrives as a file: symlink. Left true (the default), webpack
    // resolves it to its real path outside this app, and the package's own
    // 'react' import then walks the wrong node_modules chain -- worst case
    // finding a second React copy, which breaks hooks at runtime. Keeping the
    // symlink path pins every import to THIS app's node_modules.
    config.resolve.symlinks = false
    return config
  },
};

export default nextConfig;
