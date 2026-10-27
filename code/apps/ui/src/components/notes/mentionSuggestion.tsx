import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { ReactRenderer } from '@tiptap/react';
import type { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { cn } from '../../utils/cn';

export interface MentionPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface ListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const MAX_ITEMS = 6;

const MentionList = forwardRef<ListHandle, SuggestionProps<MentionPerson>>(({ items, command }, ref) => {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [items]);

  const pick = (index: number) => {
    const person = items[index];
    if (person) command({ id: person.id, label: person.name } as any);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowDown') {
        setActive((i) => (items.length ? (i + 1) % items.length : 0));
        return true;
      }
      if (event.key === 'ArrowUp') {
        setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        pick(active);
        return items.length > 0;
      }
      return false;
    },
  }));

  return (
    <div className="surface-elevated rounded-xl overflow-hidden w-64 py-1.5" role="listbox">
      <p className="px-3 pt-1 pb-1.5 text-xs font-medium text-subtle-foreground">Mention someone</p>
      {items.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Nobody in this module matches.</p>
      ) : (
        items.map((person, index) => (
          <button
            key={person.id}
            role="option"
            aria-selected={index === active}
            onMouseEnter={() => setActive(index)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(index)}
            className={cn(
              'w-full text-left px-3 py-2 flex items-center gap-2.5 cursor-pointer',
              index === active ? 'bg-muted' : 'hover:bg-muted/60'
            )}
          >
            {person.avatarUrl ? (
              <img src={person.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
            ) : (
              <span className="w-6 h-6 rounded-full bg-accent-soft text-accent text-xs font-semibold grid place-items-center shrink-0">
                {person.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-sm text-foreground truncate">{person.name}</span>
          </button>
        ))
      )}
    </div>
  );
});
MentionList.displayName = 'MentionList';

/** Places the list under the caret, or above it near the bottom of the screen. */
function place(element: HTMLElement, rect: DOMRect | null | undefined) {
  if (!rect) return;
  const below = rect.bottom + 6;
  const height = element.offsetHeight || 240;
  const top = below + height > window.innerHeight - 8 ? rect.top - height - 6 : below;
  const left = Math.min(rect.left, window.innerWidth - 272);
  Object.assign(element.style, { position: 'fixed', top: `${top}px`, left: `${Math.max(8, left)}px`, zIndex: '60' });
}

/** The `@` picker for TipTap's Mention extension, fed by the module's members. */
export function mentionSuggestion(people: () => MentionPerson[]): Omit<SuggestionOptions<MentionPerson>, 'editor'> {
  return {
    items: ({ query }) => {
      const q = query.toLowerCase();
      return people()
        .filter((p) => !q || p.name.toLowerCase().split(' ').some((word) => word.startsWith(q)) || p.name.toLowerCase().startsWith(q))
        .slice(0, MAX_ITEMS);
    },
    render: () => {
      let renderer: ReactRenderer<ListHandle, SuggestionProps<MentionPerson>> | null = null;
      return {
        onStart: (props) => {
          renderer = new ReactRenderer(MentionList, { props, editor: props.editor });
          document.body.appendChild(renderer.element);
          place(renderer.element as HTMLElement, props.clientRect?.());
        },
        onUpdate: (props) => {
          renderer?.updateProps(props);
          if (renderer) place(renderer.element as HTMLElement, props.clientRect?.());
        },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            renderer?.element.remove();
            return true;
          }
          return renderer?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          renderer?.element.remove();
          renderer?.destroy();
          renderer = null;
        },
      };
    },
  };
}
