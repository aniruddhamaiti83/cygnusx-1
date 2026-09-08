import { createFileRoute } from "@tanstack/react-router";
import { ApplicationScreen } from "@/components/intake/ApplicationScreen";

export const Route = createFileRoute("/application")({ component: ApplicationScreen });
