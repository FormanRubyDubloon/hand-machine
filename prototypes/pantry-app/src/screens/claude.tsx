// "Add with Claude": recipes come in through Claude, not a form here (REC-15's examples).
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { navigate } from "../router"
import { usePantry } from "../state"
import { Eyebrow } from "../components"

export const claudeExamples = [
  { label: "A link", text: "Save this recipe: bbcgoodfood.com/recipes/…" },
  { label: "A photo or file", text: "Save the recipe in this photo" },
  { label: "Typed or pasted", text: "Save my shakshuka: 2 peppers, 4 eggs…" },
]

export function ClaudeExamples() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {claudeExamples.map((e) => (
        <div key={e.label} className="flex flex-col gap-2 border border-border p-4">
          <Eyebrow>{e.label}</Eyebrow>
          <span className="text-sm">"{e.text}"</span>
        </div>
      ))}
    </div>
  )
}

export function AddWithClaude({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { db } = usePantry()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 p-8 sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">Add a recipe with Claude</DialogTitle>
          <DialogDescription>
            Give Claude a link, a file or the text. It saves the recipe here and links each ingredient to your pantry. It asks you when it
            isn't sure which item an ingredient means.
          </DialogDescription>
        </DialogHeader>
        <ClaudeExamples />
        {!db.claudeConnected && <p className="text-sm">Claude isn't connected yet. Set up the connection first.</p>}
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => { onOpenChange(false); navigate({ name: "settings", tab: "claude" }) }}>
            Claude connection
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(claudeExamples[2].text).catch(() => {})
              toast("Copied an example message", { description: "Paste it into Claude, on your phone or here." })
              onOpenChange(false)
            }}
          >
            <CopyIcon />
            Copy an example
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
