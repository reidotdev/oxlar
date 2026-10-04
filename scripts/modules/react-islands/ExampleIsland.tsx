import { Button } from "react-aria-components";

/**
 * Example React island. Render it from an .astro file with a client directive:
 *   <ExampleIsland client:visible />
 * Every island ships React, so use one only for a widget that cannot be built
 * accessibly with native HTML. Style it with the same tokens (no Tailwind) in a
 * sibling CSS file or a scoped <style> in the owning .astro component.
 */
export default function ExampleIsland() {
  return (
    <Button onPress={() => alert("React Aria island")}>
      React Aria button
    </Button>
  );
}
