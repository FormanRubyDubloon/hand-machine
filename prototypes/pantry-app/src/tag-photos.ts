// A photo for each common recipe tag, for the tag pills above All recipes. Picked by hand from Unsplash's free
// photos (Unsplash License: free to use, no permission needed) and loaded from Unsplash's image server, cropped
// to size by its URL parameters. A tag with no photo here gets a plain pill.
const photos: Record<string, string> = {
  vegetarian: "photo-1512621776951-a57141f2eefd", // bowl of vegetable salad
  fish: "photo-1584300005420-38486f627b07", // fish dish on a blue plate
  pasta: "photo-1473093295043-cdd812d0e601", // pesto pasta with tomatoes
  quick: "photo-1539136788836-5699e78bfc75", // salmon on quinoa with broccoli
  curry: "photo-1603894584373-5ac82b2ae398", // curry in a wooden bowl
  chicken: "photo-1615557960916-5f4791effe9d", // grilled chicken on a black plate
  stew: "photo-1764314108477-f026172e32a9", // meat stew with red chillies
  beef: "photo-1600891964092-4316c288032e", // grilled steak
  indian: "photo-1601050690597-df0568f70950", // samosas
  side: "photo-1615865417491-9941019fbc00", // rice with peas and carrots
  lamb: "photo-1784386003753-fa68aa4746e9", // Moroccan tagine
  pork: "photo-1785735011447-9942c0ba0b13", // roast pork belly
  soup: "photo-1547592166-23ac45744acd", // soup in a bowl
}

/** The photo URL for a tag, sized for a pill, or undefined when the tag has none. */
export function tagPhoto(tag: string): string | undefined {
  const id = photos[tag.toLowerCase()]
  return id && `https://images.unsplash.com/${id}?w=360&h=120&fit=crop&q=70&auto=format`
}
