
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GradeBadgeProps {
    grade?: string;
}

export function GradeBadge({ grade }: GradeBadgeProps) {
    if (!grade || grade === "-") {
        return <span className="text-muted-foreground">-</span>;
    }

    let variantClass = "bg-gray-100 text-gray-800 border-gray-200";

    switch (grade) {
        case "A":
            variantClass = "bg-green-600 text-white border-green-700 shadow-sm";
            break;
        case "B":
            variantClass = "bg-blue-600 text-white border-blue-700 shadow-sm";
            break;
        case "C":
            variantClass = "bg-yellow-500 text-white border-yellow-600 shadow-sm";
            break;
        case "D":
            variantClass = "bg-red-600 text-white border-red-700 shadow-sm";
            break;
    }

    return (
        <div className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold", variantClass)}>
            {grade}
        </div>
    );
}
