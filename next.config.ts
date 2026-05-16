import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_ACTIONS === 'true'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isGithubPages ? '/yds-trainer' : '',
  assetPrefix: isGithubPages ? '/yds-trainer/' : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? '/yds-trainer' : '',
  },
};

export default nextConfig;
