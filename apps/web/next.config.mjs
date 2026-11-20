const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/api/v1").replace(/\/$/, "");

const config = {
  agentRules: false,
  async rewrites() {
    return [{
      source: "/api/v1/auth/:action(login|logout|me)",
      destination: `${apiUrl}/auth/:action`,
    }];
  },
};
export default config;
