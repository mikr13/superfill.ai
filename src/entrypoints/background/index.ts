import { registerCategorizationService } from "@/lib/ai/categorization-service";
import { registerKeyValidationService } from "@/lib/security/key-validation-service";

export default defineBackground(() => {
  registerCategorizationService();
  registerKeyValidationService();
});

