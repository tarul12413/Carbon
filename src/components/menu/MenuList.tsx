import { Chip } from "@/components/ui/Chip";
import { copy } from "@/content/copy";
import { formatPaise, type MenuSection } from "@/domain/menu/browse";
import type { MenuItem } from "@/domain/menu/schema";
import { cx } from "@/lib/cx";

const t = copy.menu;

function Prices({ item }: { readonly item: MenuItem }) {
  if (!item.prices) return <p className="font-mono whitespace-nowrap">{item.priceNote}</p>;
  return (
    <dl className="flex flex-col items-end gap-0.5 font-mono whitespace-nowrap">
      {item.prices.map((price) => (
        <div key={price.label ?? "price"} className="flex gap-2">
          {price.label && <dt className="text-small text-fg-muted">{price.label}</dt>}
          <dd>{formatPaise(price.paise)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Item({ item }: { readonly item: MenuItem }) {
  return (
    <li
      id={item.id}
      className={cx(
        "grid scroll-mt-48 grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-line py-4 target:bg-surface-raised",
        !item.available && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{item.name}</h3>
          {item.steepHours !== undefined && (
            <Chip>
              <span className="sr-only">{t.steeped(item.steepHours)}</span>
              <span aria-hidden="true">{item.steepHours}h</span>
            </Chip>
          )}
          {item.servedHot && <span className="font-mono text-small text-accent">{t.servedHot}</span>}
          {!item.available && (
            <Chip tone="outline" className="text-danger">
              {t.notToday}
            </Chip>
          )}
        </div>
        {item.notes && <p className="text-fg-muted italic">{item.notes}</p>}
      </div>
      <Prices item={item} />
    </li>
  );
}

interface MenuListProps {
  readonly sections: readonly MenuSection[];
  readonly showSectionNav: boolean;
}

export function MenuList({ sections, showSectionNav }: MenuListProps) {
  return (
    <div className="flex flex-col gap-12">
      {showSectionNav && (
        <nav aria-label={t.sectionsLabel}>
          <ul className="-mx-1 flex gap-x-5 overflow-x-auto px-1 tablet:flex-wrap tablet:gap-y-1 tablet:overflow-visible">
            {sections.map(({ category }) => (
              <li key={category.id}>
                <a
                  href={`#section-${category.id}`}
                  className="inline-flex min-h-11 items-center text-small font-medium tracking-wide whitespace-nowrap uppercase hover-fine:text-accent"
                >
                  {category.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {sections.map(({ category, items }, index) => {
        const startsGroup = category.group && sections[index - 1]?.category.group !== category.group;
        return (
          <section
            key={category.id}
            id={`section-${category.id}`}
            aria-labelledby={`heading-${category.id}`}
            className="scroll-mt-48"
          >
            {startsGroup && <p className="label-caps mb-2 text-small text-fg-muted">{category.group}</p>}
            <h2 id={`heading-${category.id}`} className="label-caps text-h3">
              {category.name}
            </h2>
            {category.note && <p className="mt-1 text-small text-fg-muted italic">{category.note}</p>}
            <ul className="mt-4 border-t border-line">
              {items.map((item) => (
                <Item key={item.id} item={item} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
