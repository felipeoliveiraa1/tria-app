export type Toast = { title?: string; description?: string; variant?: string; action?: any }

export function useToast() {
  return {
    toast: ({ title, description }: Toast) => {
      if (title) console.log(`Toast: ${title}`)
      if (description) console.log(description)
    }
  }
}

export const toast = ({ title, description }: Toast) => {
  if (title) console.log(`Toast: ${title}`)
  if (description) console.log(description)
}
