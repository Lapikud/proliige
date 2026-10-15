export const accessConfig = {
  memberGroups: ["pixels", "members"],
  pixelGroups: ["pixels"],
  adminGroups: ["team_juhatus"],
} satisfies AccessConfig;

export interface AccessConfig {
  readonly memberGroups: ReadonlyArray<string>;
  readonly pixelGroups: ReadonlyArray<string>;
  readonly adminGroups: ReadonlyArray<string>;
}
