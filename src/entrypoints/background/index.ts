import { registerCategorizationService } from "@/lib/ai/categorization-service";
import { registerAutofillService } from "@/lib/autofill/autofill-service";
import { registerKeyValidationService } from "@/lib/security/key-validation-service";

export default defineBackground(() => {
  registerCategorizationService();
  registerKeyValidationService();
  registerAutofillService();
});
