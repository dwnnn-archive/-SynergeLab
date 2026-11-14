import { useLayoutEffect, useRef } from "react";

// Measure slots inside each scroll container so scrolling never looks like a reorder.
export function useCardMotion(root, board, paused, createdCard) {
  const previous = useRef(null);
  useLayoutEffect(() => {
    if (paused) return;
    if (!root.current || !board) {
      previous.current = null;
      return;
    }
    const slots = [...root.current.querySelectorAll(".card-slot")];
    const positions = new Map(
      slots.map((slot) => [
        slot.querySelector(".card").dataset.taskId,
        { top: slot.offsetTop, column: slot.parentElement },
      ]),
    );
    const ids = new Set(board.tasks.map((task) => task.id));
    const added = new Set(
      previous.current
        ? [...ids].filter((id) => !previous.current.ids.has(id))
        : [],
    );
    if (createdCard.current) {
      const created = positions.get(createdCard.current);
      if (created) created.column.scrollTop = 0;
      createdCard.current = null;
    }
    if (added.size && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const slot of slots) {
        const id = slot.querySelector(".card").dataset.taskId;
        const current = positions.get(id);
        const old = previous.current.positions.get(id);
        if (added.has(id)) {
          slot.animate(
            [
              { opacity: 0, transform: "translateY(-8px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 220, delay: 50, easing: "ease-out", fill: "backwards" },
          );
        } else if (old?.column === current.column && old.top !== current.top) {
          slot.animate(
            [
              {
                transform: `translateY(${old.top - current.top}px)`,
                opacity: 1,
              },
              { opacity: 0.4, offset: 0.3 },
              { transform: "translateY(0)", opacity: 1 },
            ],
            { duration: 280, easing: "cubic-bezier(.2,.7,.2,1)" },
          );
        }
      }
    }
    previous.current = { positions, ids };
  });
}
