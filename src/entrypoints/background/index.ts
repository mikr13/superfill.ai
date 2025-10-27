import { registerCategorizationService } from "@/lib/ai/categorization-service";

export default defineBackground(() => {
  registerCategorizationService();
});
