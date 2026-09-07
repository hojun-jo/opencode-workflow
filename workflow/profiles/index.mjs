import bugfix from "./bugfix.mjs";
import full from "./full.mjs";
import prototype from "./prototype.mjs";
import quick from "./quick.mjs";

export const profiles = { full, quick, bugfix, prototype };

export function getProfile(name) {
  const profile = profiles[name];
  if (!profile) throw new Error(`Unknown workflow profile: ${name}. Supported: ${Object.keys(profiles).join(", ")}.`);
  return profile;
}
