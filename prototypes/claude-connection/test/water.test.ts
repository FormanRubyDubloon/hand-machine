import { test, expect } from "vitest"
import { isWater } from "../../pantry-app/src/model"
test("plain water counts as always to hand; flavoured waters and prep notes don't", () => {
  const yes = ["250ml water", "Water", "water, to cover", "1 litre boiling water", "a splash of water", "about 500ml cold water", "2 cups water", "Water (as needed)", "1.5 litres tap water", "water or stock"]
  const no = ["½ cup kelp water", "coconut water", "rose water", "sparkling water", "6 long red dried chillies, soaked in water and roughly chopped", "watercress"]
  expect(yes.filter((t) => !isWater(t))).toEqual([])
  expect(no.filter(isWater)).toEqual([])
})
