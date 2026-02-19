"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MaturityLevel = "NA_OR_NOT_SURE" | "NOT_EVIDENT" | "BEGINNING" | "GROWING" | "MATURING";

interface EvaluationQuestionProps {
    questionId: number;
    statement: string;
    value?: MaturityLevel;
    onChange: (val: MaturityLevel) => void;
}

const LEVEL_OPTIONS: { value: MaturityLevel; label: string; color: string }[] = [
    { value: "NA_OR_NOT_SURE", label: "N/A / Not Sure", color: "bg-gray-100 border-gray-200 text-gray-900" },
    { value: "NOT_EVIDENT", label: "Not Evident", color: "bg-red-100 border-red-200 text-red-900" },
    { value: "BEGINNING", label: "Beginning", color: "bg-orange-100 border-orange-200 text-orange-900" },
    { value: "GROWING", label: "Growing", color: "bg-yellow-100 border-yellow-200 text-yellow-900" },
    { value: "MATURING", label: "Maturing", color: "bg-green-100 border-green-200 text-green-900" },
];

export function EvaluationRow({ questionId, statement, value, onChange }: EvaluationQuestionProps) {
    return (
        <div className="py-4 border-b last:border-0 border-border/40">
            <p className="font-medium text-sm mb-3">{statement}</p>

            <RadioGroup
                value={value}
                onValueChange={(v) => onChange(v as MaturityLevel)}
                className="flex flex-wrap gap-2 md:gap-4"
            >
                {LEVEL_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt.value} id={`q-${questionId}-${opt.value}`} />
                        <Label
                            htmlFor={`q-${questionId}-${opt.value}`}
                            className={cn(
                                "text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:brightness-95",
                                opt.color,
                                value === opt.value ? "ring-2 ring-primary ring-offset-1 font-semibold" : "opacity-80"
                            )}
                        >
                            {opt.label}
                        </Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
    );
}
