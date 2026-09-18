import type { TaskPolicy } from "~/domain/task";

export interface TaskView {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  points: number;
  policy: TaskPolicy;
  cooldownSeconds: number | null;
  photoRequired: boolean;
  photoInstructions: string | null;
  archived: boolean;
}

export interface CategoryView {
  id: string;
  name: string;
}
