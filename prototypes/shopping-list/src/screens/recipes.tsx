import * as React from "react"
import { motion } from "motion/react"
import { AnimatePresence } from "motion/react"
import { ArrowLeftIcon, CloudIcon, MenuIcon, PlusIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CountBox } from "@/components/ui/count-box"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { minutesText } from "../../../shared/src/pantry"
import { haveText, nameList, plural, recipeFor, recipeSummary, type IngredientStatus, type Item, type Recipe } from "../model"
import { goBack, navigate, Redirect } from "../router"
import { useApp } from "../state"
import { IngredientRow, InfoNote, RecipeRow } from "../components"
import { HeaderButton, Screen, SectionHeading } from "../layout"

/** RECIPE-01: "Want to cook" recipes first, saved on this phone. The rest need signal. */
export function Recipes() {
  const { state } = useApp()
  const [query, setQuery] = React.useState("")
  const offline = state.simulateOffline || !navigator.onLine

  const matching = state.recipes.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
  const saved = matching.filter((r) => r.wantToCook)
  const others = matching.filter((r) => !r.wantToCook)

  const row = (recipe: Recipe, index: number) => {
    const { short, canCook } = recipeSummary(recipe, state)
    const detail = [
      minutesText(recipe.minutes),
      recipe.soon,
      short.length
        ? recipe.wantToCook
          ? `short of ${short.length} not on your list`
          : `short of ${nameList(short.map((r) => r.item?.name.toLowerCase() ?? r.ing.text))}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ")
    return (
      <RecipeRow
        key={recipe.id}
        recipe={recipe}
        detail={detail}
        short={canCook ? 0 : short.length}
        disabled={offline && !recipe.wantToCook}
        index={index}
        onOpen={() => navigate({ name: "recipe", id: recipe.id })}
      />
    )
  }

  return (
    <Screen
      eyebrow="Shopping list"
      title="Recipes"
      leading={<HeaderButton icon={ArrowLeftIcon} label="Back" onClick={() => goBack({ name: "home" })} />}
      action={<HeaderButton icon={MenuIcon} label="Menu" onClick={() => navigate({ name: "menu" })} />}
      below={
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Search recipes"
            placeholder="Search recipes"
            className="pl-7"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      }
    >
      {saved.length > 0 && (
        <>
          <SectionHeading className="border-b-0">Want to cook · {saved.length}</SectionHeading>
          <div className="border-t border-primary">{saved.map(row)}</div>
        </>
      )}
      {others.length > 0 && (
        <>
          <SectionHeading className="border-b-0">All recipes · {others.length}</SectionHeading>
          <div className="border-t border-primary">{others.map((r, i) => row(r, i + saved.length))}</div>
        </>
      )}
      <InfoNote icon={CloudIcon} className="mt-auto border-b-0">
        Recipes you mark Want to cook are saved on this phone, so they open in a shop with no signal. The others need signal.
      </InfoNote>
      {matching.length === 0 && <p className="px-5 py-4 text-sm leading-5 text-muted-foreground">No recipes match "{query}".</p>}
    </Screen>
  )
}

function stockLine(recipe: Recipe, item: Item | undefined, status: IngredientStatus) {
  if (!item) return "not in your pantry"
  if (status === "listed") {
    if (item.target > 0) return item.inStock === 0 ? "out of stock" : `${haveText(item)} in stock, on your list`
    return recipeFor(item) === recipe.name ? "added for this recipe" : "on your list"
  }
  if (status === "short") return item.inStock === 0 ? "none in stock" : `${haveText(item)} in stock`
  return item.type === "bulk" ? haveText(item) : `${item.inStock} in stock`
}

/** RECIPE-02: ingredients against stock and the list, with Add for anything missing. */
export function RecipeDetail({ id }: { id: string }) {
  const { state, actions } = useApp()
  const recipe = state.recipes.find((r) => r.id === id)
  const [tab, setTab] = React.useState("ingredients")
  if (!recipe) return <Redirect to={{ name: "recipes" }} />

  const { rows, short } = recipeSummary(recipe, state)
  const add = (itemId: string, qty: number) => actions.addToList(itemId, qty, recipe.name)

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <Screen
        eyebrow={recipe.wantToCook ? "Want to cook · saved on this phone" : "Recipe"}
        title={recipe.name}
        leading={<HeaderButton icon={ArrowLeftIcon} label="Back to recipes" onClick={() => goBack({ name: "recipes" })} />}
        below={
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {minutesText(recipe.minutes)} · Serves {recipe.serves}
            </span>
            <TabsList>
              <TabsTrigger value="ingredients" className="data-active:bg-primary data-active:text-primary-foreground dark:data-active:border-transparent dark:data-active:bg-primary dark:data-active:text-primary-foreground">
                Ingredients
              </TabsTrigger>
              <TabsTrigger value="method" className="data-active:bg-primary data-active:text-primary-foreground dark:data-active:border-transparent dark:data-active:bg-primary dark:data-active:text-primary-foreground">
                Method
              </TabsTrigger>
            </TabsList>
          </div>
        }
        footer={
          tab === "ingredients" ? (
            <>
              <p className="text-sm leading-5 text-muted-foreground">
                {short.length
                  ? `${plural(short.length, "thing")} ${short.length === 1 ? "isn't" : "aren't"} on your list yet. `
                  : "Everything is here or on your list. "}
                A dark tick means you have it, a light tick means you have an open pack.
              </p>
              <AnimatePresence initial={false}>
                {short.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <Button size="lg" className="w-full" onClick={() => short.forEach((r) => add(r.ing.itemId, r.ing.buy))}>
                      <PlusIcon className="size-4" />
                      Add {short.length} to the list
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : undefined
        }
      >
        <TabsContent value="ingredients" asChild>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
            {rows.map(({ ing, item, status }) => (
              <IngredientRow
                key={ing.itemId}
                text={ing.text}
                detail={`${item?.name ?? ing.itemId} · ${stockLine(recipe, item, status)}`}
                status={status}
                onAdd={() => add(ing.itemId, ing.buy)}
              />
            ))}
          </motion.div>
        </TabsContent>
        <TabsContent value="method" asChild>
          <motion.ol initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
            {recipe.method.map((step, i) => (
              <li key={i} className="flex items-start gap-4 border-b border-border px-5 py-4">
                <CountBox size="sm" aria-hidden="true">{i + 1}</CountBox>
                <p className="type-lead pt-1.5 text-[17px] leading-6">{step}</p>
              </li>
            ))}
          </motion.ol>
        </TabsContent>
        {tab === "method" && <InfoNote label="Placeholder">The Method tab isn't drawn in the handoff yet. These steps are stand-ins.</InfoNote>}
      </Screen>
    </Tabs>
  )
}
