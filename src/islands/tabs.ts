/**
 * <ui-tabs>: progressive enhancement. Server HTML is a stack of labelled
 * panels (readable without JS). On upgrade this builds a WAI-ARIA tablist,
 * shows one panel at a time and adds arrow/Home/End navigation.
 */
class UiTabs extends HTMLElement {
  connectedCallback() {
    const panels = [
      ...this.querySelectorAll<HTMLElement>(":scope > [data-tab-panel]"),
    ];
    if (panels.length === 0 || this.querySelector('[role="tablist"]')) return;

    const list = document.createElement("div");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", this.dataset["label"] ?? "");

    const tabs = panels.map((panel, i) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.id = `${panel.id}-tab`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      tab.textContent = panel.dataset["label"] ?? panel.id;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.tabIndex = 0;
      tab.addEventListener("click", () => this.select(tabs, panels, i));
      return tab;
    });

    list.append(...tabs);
    list.addEventListener("keydown", (event) => {
      const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        event.key === "ArrowRight"
          ? current + 1
          : event.key === "ArrowLeft"
            ? current - 1
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : null;
      if (next === null) return;
      event.preventDefault();
      this.select(tabs, panels, (next + tabs.length) % tabs.length, true);
    });

    this.prepend(list);
    const fromHash = panels.findIndex((p) => `#${p.id}` === location.hash);
    this.select(tabs, panels, Math.max(fromHash, 0));
  }

  private select(
    tabs: HTMLButtonElement[],
    panels: HTMLElement[],
    index: number,
    focus = false,
  ) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i]!.hidden = !active;
    });
    if (focus) tabs[index]?.focus();
  }
}

if (!customElements.get("ui-tabs")) customElements.define("ui-tabs", UiTabs);
