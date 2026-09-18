"use client";

import { useRouter } from "next/navigation";
import type { FC } from "react";
import type { PublicUserView } from "~/domain/user";
import { Select } from "../ui/formControls";

interface Props {
  users: ReadonlyArray<PublicUserView>;
  current: string;
}

export const UserPicker: FC<Props> = ({ users, current }) => {
  const router = useRouter();

  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold">
      Show someone else
      <Select
        value={current}
        onChange={(event) => {
          router.push(`/users/${event.target.value}`);
        }}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.displayName}
          </option>
        ))}
      </Select>
    </label>
  );
};
