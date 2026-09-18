import type { Metadata } from "next";
import type { FC, ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const PrivateLayout: FC<{ children: ReactNode }> = ({ children }) => children;

export default PrivateLayout;
