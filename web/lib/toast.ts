// Central error/success notification helpers. Wraps sonner so the call
// site is library-agnostic — swap the import here to migrate everywhere.
import { toast } from 'sonner'

export const showError = (message: string) => toast.error(message)
export const showSuccess = (message: string) => toast.success(message)
export const showInfo = (message: string) => toast(message)
