"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Reveals children in sequence as they scroll into view (pipeline, chain). */
export function RevealList({ children, className, as = "ol" }: { children: ReactNode[]; className?: string; as?: "ol" | "ul" }) {
  const reduce = useReducedMotion();
  const List = as === "ol" ? motion.ol : motion.ul;
  return (
    <List
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
    >
      {children.map((child, i) => (
        <motion.li
          key={i}
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } }}
          className="h-full"
        >
          {child}
        </motion.li>
      ))}
    </List>
  );
}
