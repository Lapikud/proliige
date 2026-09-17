export const accessConfig = {
  memberGroups: ["pixels", "members"],
  adminGroups: ["team_juhatus"],
} satisfies AccessConfig;

export interface AccessConfig {
  readonly memberGroups: ReadonlyArray<string>;
  readonly adminGroups: ReadonlyArray<string>;
}
