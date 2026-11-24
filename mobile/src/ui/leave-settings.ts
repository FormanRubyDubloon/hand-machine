// Leaving Settings from any of its pages, straight back to where you were (Batch 1, 24 Nov 2026).
//
// Settings is its own stack inside a full-screen modal. router.dismissAll() only goes back to the first page of
// that stack (Settings itself), so Done on Stores or a store landed on Settings, not out. Going back on the
// parent navigator closes the whole modal from any page.
//
// Settings saves as you go, so there's nothing to ask about except text typed into an Add field and not added.
import { useNavigation } from "expo-router"
import * as React from "react"
import { Alert } from "react-native"

export function useLeaveSettings() {
  const navigation = useNavigation()
  return React.useCallback((unsaved?: string) => {
    const close = () => {
      const parent = navigation.getParent()
      if (parent?.canGoBack()) parent.goBack()
      else if (navigation.canGoBack()) navigation.goBack()
    }
    if (!unsaved) return close()
    Alert.alert("Leave without adding?", `You typed “${unsaved}” but didn't add it.`, [
      { text: "Keep editing", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: close },
    ])
  }, [navigation])
}
