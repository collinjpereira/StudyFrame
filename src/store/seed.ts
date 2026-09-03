import type { Workspace } from "./types";
import { migrateWorkspace } from "./migrate";

/**
 * First launch: one empty workspace, and the shell opens its study plan so the
 * first thing the user does is set a date and their hours. No sample courses —
 * a library the user did not create is a library they have to clean up.
 */
export function firstRunWorkspace(): Workspace {
  return migrateWorkspace({
    id: `ws-${Date.now()}`,
    name: "My studies",
    examDate: "",
    hoursPerWeek: 5,
    courses: [],
  });
}
