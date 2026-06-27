// Os bootstraps em ../install/* são importados como texto puro (regra `Text`
// em wrangler.toml). Declarações para o TypeScript reconhecer essas extensões.
declare module "*.sh" {
  const content: string;
  export default content;
}

declare module "*.ps1" {
  const content: string;
  export default content;
}

declare module "*.bat" {
  const content: string;
  export default content;
}

declare module "*.desktop" {
  const content: string;
  export default content;
}
