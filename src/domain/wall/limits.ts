/** Field lengths (wireframe 10: "One line: why? (80 chars)"). Shared by the inputs and the service. No zod here. */
export const WALL_LIMITS = { title: 80, author: 60, line: 80, handle: 30 } as const;

/** Seconds a person needs at least to fill the form: the mock bot check's time trap. */
export const WALL_MIN_FILL_SECONDS = 3;
