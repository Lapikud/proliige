import type { FC } from "react";
import { ListSkeleton } from "~/components/ui/feedback";

const Loading: FC = () => <ListSkeleton rows={4} />;

export default Loading;
