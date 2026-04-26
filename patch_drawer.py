path = "/Users/haritran/source/noobstore/mobile-noobstore/apps/web/src/components/product/QuickPickDrawer.tsx"
with open(path) as f:
    src = f.read()

# ── 1. Kit configurator group variants ────────────────────────────────────────
old1 = '''\t\t\t\t\t\t\t{group.variants.map((v) => {
\t\t\t\t\t\t\t\tconst selected =
\t\t\t\t\t\t\t\t\tstate.selections[group.component_group] ===
\t\t\t\t\t\t\t\t\tv.id;
\t\t\t\t\t\t\t\treturn (
\t\t\t\t\t\t\t\t\t<button
\t\t\t\t\t\t\t\t\t\tkey={v.id}
\t\t\t\t\t\t\t\t\t\ttype="button"
\t\t\t\t\t\t\t\t\t\tonClick={() =>
\t\t\t\t\t\t\t\t\t\t\tdispatch({
\t\t\t\t\t\t\t\t\t\t\t\ttype: "SELECT",
\t\t\t\t\t\t\t\t\t\t\t\tgroup: group.component_group,
\t\t\t\t\t\t\t\t\t\t\t\tvariantId: v.id,
\t\t\t\t\t\t\t\t\t\t\t})
\t\t\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t\t\t\tclassName={clsx(
\t\t\t\t\t\t\t\t\t\t\t"flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-bold transition-all border",
\t\t\t\t\t\t\t\t\t\t\tselected
\t\t\t\t\t\t\t\t\t\t\t\t? "bg-primary text-white border-primary shadow-lg"
\t\t\t\t\t\t\t\t\t\t\t\t: "bg-surface-container text-on-surface border-transparent hover:border-outline-variant",
\t\t\t\t\t\t\t\t\t\t)}>
\t\t\t\t\t\t\t\t\t\t{v.thumbnail && (
\t\t\t\t\t\t\t\t\t\t\t<Thumbnail
\t\t\t\t\t\t\t\t\t\t\t\tsrc={v.thumbnail}
\t\t\t\t\t\t\t\t\t\t\t\talt={v.variant_name}
\t\t\t\t\t\t\t\t\t\t\t\tclassName="w-12 h-12 rounded-lg"
\t\t\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t\t<div className="text-left">
\t\t\t\t\t\t\t\t\t\t\t<p className="font-black text-sm leading-none">
\t\t\t\t\t\t\t\t\t\t\t\t{v.variant_name}
\t\t\t\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t\t\t\t\t{v.price_adjustment !== 0 && (
\t\t\t\t\t\t\t\t\t\t\t\t<p
\t\t\t\t\t\t\t\t\t\t\t\t\tclassName={clsx(
\t\t\t\t\t\t\t\t\t\t\t\t\t\t"text-xs mt-0.5",
\t\t\t\t\t\t\t\t\t\t\t\t\t\tselected
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t? "opacity-80"
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t: "opacity-60",
\t\t\t\t\t\t\t\t\t\t\t\t\t)}>
\t\t\t\t\t\t\t\t\t\t\t\t\t+
\t\t\t\t\t\t\t\t\t\t\t\t\t{formatVND(
\t\t\t\t\t\t\t\t\t\t\t\t\t\tv.price_adjustment,
\t\t\t\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t</button>
\t\t\t\t\t\t\t\t);
\t\t\t\t\t\t\t})}'''

new1 = '''\t\t\t\t\t\t\t{group.variants.map((v) => {
\t\t\t\t\t\t\t\tconst selected =
\t\t\t\t\t\t\t\t\tstate.selections[group.component_group] ===
\t\t\t\t\t\t\t\t\tv.id;
\t\t\t\t\t\t\t\tconst soldOut = v.stock_quantity === 0;
\t\t\t\t\t\t\t\treturn (
\t\t\t\t\t\t\t\t\t<button
\t\t\t\t\t\t\t\t\t\tkey={v.id}
\t\t\t\t\t\t\t\t\t\ttype="button"
\t\t\t\t\t\t\t\t\t\tdisabled={soldOut}
\t\t\t\t\t\t\t\t\t\tonClick={() =>
\t\t\t\t\t\t\t\t\t\t\tdispatch({
\t\t\t\t\t\t\t\t\t\t\t\ttype: "SELECT",
\t\t\t\t\t\t\t\t\t\t\t\tgroup: group.component_group,
\t\t\t\t\t\t\t\t\t\t\t\tvariantId: v.id,
\t\t\t\t\t\t\t\t\t\t\t})
\t\t\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t\t\t\tclassName={clsx(
\t\t\t\t\t\t\t\t\t\t\t"flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-bold transition-all border",
\t\t\t\t\t\t\t\t\t\t\tsoldOut
\t\t\t\t\t\t\t\t\t\t\t\t? "opacity-40 cursor-not-allowed bg-surface-container border-transparent"
\t\t\t\t\t\t\t\t\t\t\t\t: selected
\t\t\t\t\t\t\t\t\t\t\t\t? "bg-primary text-white border-primary shadow-lg"
\t\t\t\t\t\t\t\t\t\t\t\t: "bg-surface-container text-on-surface border-transparent hover:border-outline-variant",
\t\t\t\t\t\t\t\t\t\t)}>
\t\t\t\t\t\t\t\t\t\t{v.thumbnail && (
\t\t\t\t\t\t\t\t\t\t\t<Thumbnail
\t\t\t\t\t\t\t\t\t\t\t\tsrc={v.thumbnail}
\t\t\t\t\t\t\t\t\t\t\t\talt={v.variant_name}
\t\t\t\t\t\t\t\t\t\t\t\tclassName="w-12 h-12 rounded-lg"
\t\t\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t\t<div className="text-left">
\t\t\t\t\t\t\t\t\t\t\t<p className="font-black text-sm leading-none">
\t\t\t\t\t\t\t\t\t\t\t\t{v.variant_name}
\t\t\t\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t\t\t\t\t{soldOut ? (
\t\t\t\t\t\t\t\t\t\t\t\t<p className="text-[10px] font-black text-error mt-0.5 uppercase tracking-wide">
\t\t\t\t\t\t\t\t\t\t\t\t\tHết hàng
\t\t\t\t\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t\t\t\t\t) : v.price_adjustment !== 0 ? (
\t\t\t\t\t\t\t\t\t\t\t\t<p
\t\t\t\t\t\t\t\t\t\t\t\t\tclassName={clsx(
\t\t\t\t\t\t\t\t\t\t\t\t\t\t"text-xs mt-0.5",
\t\t\t\t\t\t\t\t\t\t\t\t\t\tselected
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t? "opacity-80"
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t: "opacity-60",
\t\t\t\t\t\t\t\t\t\t\t\t\t)}>
\t\t\t\t\t\t\t\t\t\t\t\t\t+{formatVND(v.price_adjustment)}
\t\t\t\t\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t\t\t\t\t) : null}
\t\t\t\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t\t\t\t</button>
\t\t\t\t\t\t\t\t);
\t\t\t\t\t\t\t})}'''

# ── 2. Simple variant selector ─────────────────────────────────────────────────
old2 = '''\t\t\t\t\t\t{activeProduct.variants.map((v) => (
\t\t\t\t\t\t\t<button
\t\t\t\t\t\t\t\tkey={v.id}
\t\t\t\t\t\t\t\ttype="button"
\t\t\t\t\t\t\t\tonClick={() =>
\t\t\t\t\t\t\t\t\t   dispatch({
\t\t\t\t\t\t\t\t\t   type: "SELECT",
\t\t\t\t\t\t\t\t\t   group: "__variant__",
\t\t\t\t\t\t\t\t\t   variantId: v.id,
\t\t\t\t\t\t\t\t\t   })
\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t\tclassName={clsx(
\t\t\t\t\t\t\t\t\t   "py-3 px-4 rounded-xl text-sm font-bold transition-all text-left",
\t\t\t\t\t\t\t\t\t   state.selections["__variant__"] === v.id
\t\t\t\t\t\t\t\t\t   ? "bg-primary text-white shadow-lg"
\t\t\t\t\t\t\t\t\t   : "bg-surface-container text-on-surface hover:bg-surface-container-high",
\t\t\t\t\t\t\t\t)}>
\t\t\t\t\t\t\t\t<p className="font-black truncate">
\t\t\t\t\t\t\t\t\t{v.variant_name}
\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t\t<p className="text-xs opacity-70 mt-0.5">
\t\t\t\t\t\t\t\t\t{formatVND(v.effective_price)}
\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t</button>
\t\t\t\t\t\t))}'''

new2 = '''\t\t\t\t\t\t{activeProduct.variants.map((v) => {
\t\t\t\t\t\t\tconst isSelected = state.selections["__variant__"] === v.id;
\t\t\t\t\t\t\tconst soldOut = v.stock_quantity === 0;
\t\t\t\t\t\t\treturn (
\t\t\t\t\t\t\t\t<button
\t\t\t\t\t\t\t\t\tkey={v.id}
\t\t\t\t\t\t\t\t\ttype="button"
\t\t\t\t\t\t\t\t\tdisabled={soldOut}
\t\t\t\t\t\t\t\t\tonClick={() =>
\t\t\t\t\t\t\t\t\t\tdispatch({
\t\t\t\t\t\t\t\t\t\t\ttype: "SELECT",
\t\t\t\t\t\t\t\t\t\t\tgroup: "__variant__",
\t\t\t\t\t\t\t\t\t\t\tvariantId: v.id,
\t\t\t\t\t\t\t\t\t\t})
\t\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t\t\tclassName={clsx(
\t\t\t\t\t\t\t\t\t\t"py-3 px-4 rounded-xl text-sm font-bold transition-all text-left",
\t\t\t\t\t\t\t\t\t\tsoldOut
\t\t\t\t\t\t\t\t\t\t\t? "opacity-40 cursor-not-allowed bg-surface-container"
\t\t\t\t\t\t\t\t\t\t\t: isSelected
\t\t\t\t\t\t\t\t\t\t\t? "bg-primary text-white shadow-lg"
\t\t\t\t\t\t\t\t\t\t\t: "bg-surface-container text-on-surface hover:bg-surface-container-high",
\t\t\t\t\t\t\t\t\t)}>
\t\t\t\t\t\t\t\t\t<p className="font-black truncate">
\t\t\t\t\t\t\t\t\t\t{v.variant_name}
\t\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t\t\t{soldOut ? (
\t\t\t\t\t\t\t\t\t\t<p className="text-[10px] font-black text-error mt-0.5 uppercase tracking-wide">
\t\t\t\t\t\t\t\t\t\t\tHết hàng
\t\t\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t\t\t\t<p className="text-xs opacity-70 mt-0.5">
\t\t\t\t\t\t\t\t\t\t\t{formatVND(v.effective_price)}
\t\t\t\t\t\t\t\t\t\t</p>
\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t</button>
\t\t\t\t\t\t\t);
\t\t\t\t\t\t})}'''

assert old1 in src, f"old1 not found! snippet: {repr(src[14300:14500])}"
assert old2 in src, f"old2 not found!"

result = src.replace(old1, new1, 1).replace(old2, new2, 1)
with open(path, "w") as f:
    f.write(result)
print("done")
