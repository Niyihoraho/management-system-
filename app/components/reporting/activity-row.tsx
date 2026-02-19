"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ImageUpload } from "@/components/reporting/image-upload";
import { Trash2, PenLine, List, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfigData = {
    id: number;
    name: string;
    categories: {
        id: number;
        name: string;
        templates: { id: number; name: string }[];
    }[];
};

type ActivityLog = {
    tempId: string;
    categoryId: string;
    activityName: string;
    beneficiaries: string;
    participantCount: string;
    dateOccurred: string;
    facilitators: string;
    followUpPractice: string;
    impactSummary: string;
    imageUrl: string;
    isCustom?: boolean;
};

interface ActivityRowProps {
    index: number;
    activity: ActivityLog;
    config: ConfigData;
    onUpdate: (updates: Partial<ActivityLog>) => void;
    onRemove: () => void;
    showRemove: boolean;
}

export function ActivityRow({ index, activity, config, onUpdate, onRemove, showRemove }: ActivityRowProps) {
    const currentCategory = config.categories.find(c => c.id.toString() === activity.categoryId);
    const templates = currentCategory?.templates || [];

    const [openCategory, setOpenCategory] = useState(false);
    const [openActivity, setOpenActivity] = useState(false);

    const handleCategorySelect = (value: string) => {
        // Batch all 3 field resets into ONE atomic state update
        onUpdate({ categoryId: value, activityName: "", isCustom: false });
        setOpenCategory(false);
    };

    const handleActivitySelect = (value: string) => {
        onUpdate({ activityName: value });
        setOpenActivity(false);
    };

    const toggleCustomMode = () => {
        const newMode = !activity.isCustom;
        // Batch both field updates atomically
        onUpdate({ isCustom: newMode, activityName: "" });
    };

    return (
        <Card className="relative border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 bg-muted/20">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base">Activity #{index + 1}</CardTitle>
                    {showRemove && (
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/10" onClick={onRemove}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

                {/* 1. Category Selection */}
                <div className="space-y-2">
                    <Label>Category <span className="text-red-500">*</span></Label>
                    <Popover open={openCategory} onOpenChange={setOpenCategory}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCategory}
                                className="w-full justify-between font-normal text-left h-auto min-h-[40px] py-2"
                            >
                                <span className="truncate mr-2">
                                    {activity.categoryId
                                        ? config.categories.find((cat) => cat.id.toString() === activity.categoryId)?.name
                                        : "Select Category..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search category..." />
                                <CommandList>
                                    <CommandEmpty>No category found.</CommandEmpty>
                                    <CommandGroup>
                                        {config.categories.map((cat) => (
                                            <CommandItem
                                                key={cat.id}
                                                value={cat.name}
                                                onSelect={() => handleCategorySelect(cat.id.toString())}
                                                className="break-words"
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4 shrink-0",
                                                        activity.categoryId === cat.id.toString() ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {cat.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* 2. Activity Name Selection */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>Activity Name <span className="text-red-500">*</span></Label>
                        {activity.categoryId && (
                            <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs text-blue-600 font-normal hover:no-underline"
                                onClick={toggleCustomMode}
                            >
                                {activity.isCustom ? (
                                    <span className="flex items-center"><List className="w-3 h-3 mr-1" /> Pick from list</span>
                                ) : (
                                    <span className="flex items-center"><PenLine className="w-3 h-3 mr-1" /> Type custom name</span>
                                )}
                            </Button>
                        )}
                    </div>

                    <div className="relative">
                        {activity.isCustom ? (
                            <div className="animate-in fade-in zoom-in-95 duration-200">
                                <Input
                                    placeholder="Type specific activity name..."
                                    value={activity.activityName}
                                    onChange={(e) => onUpdate({ activityName: e.target.value })}
                                    className="border-primary/50 focus-visible:ring-primary"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <Popover open={openActivity} onOpenChange={setOpenActivity}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openActivity}
                                        disabled={!activity.categoryId}
                                        className="w-full justify-between font-normal text-left disabled:opacity-50 disabled:cursor-not-allowed h-auto min-h-[40px] py-2"
                                    >
                                        <span className="truncate mr-2">
                                            {activity.activityName
                                                ? activity.activityName
                                                : (!activity.categoryId ? "Select category first" : "Select Activity Template...")}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search template..." />
                                        <CommandList>
                                            <CommandEmpty>No template found.</CommandEmpty>
                                            <CommandGroup>
                                                {templates.map((t) => (
                                                    <CommandItem
                                                        key={t.id}
                                                        value={t.name}
                                                        onSelect={() => handleActivitySelect(t.name)}
                                                        className="break-words"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4 shrink-0",
                                                                activity.activityName === t.name ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {t.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                </div>

                {/* 3. Details Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>When <span className="text-red-500">*</span></Label>
                        <Input
                            type="date"
                            value={activity.dateOccurred}
                            onChange={(e) => onUpdate({ dateOccurred: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Particip. <span className="text-red-500">*</span></Label>
                        <Input
                            type="number"
                            placeholder="0"
                            value={activity.participantCount}
                            onChange={(e) => onUpdate({ participantCount: e.target.value })}
                        />
                    </div>
                </div>

                {/* 4. Secondary Details Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Beneficiaries</Label>
                        <Input
                            placeholder="e.g. First year students"
                            value={activity.beneficiaries}
                            onChange={(e) => onUpdate({ beneficiaries: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Facilitators</Label>
                        <Input
                            placeholder="Names of leaders/trainers"
                            value={activity.facilitators}
                            onChange={(e) => onUpdate({ facilitators: e.target.value })}
                        />
                    </div>
                </div>

                {/* 5. Qualitative & Image */}
                <div className="grid md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-2">
                        <Label>Impact Summary</Label>
                        <Textarea
                            placeholder="Brief summary of the outcome..."
                            className="h-32 resize-none"
                            value={activity.impactSummary}
                            onChange={(e) => onUpdate({ impactSummary: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="block mb-2">Activity Evidence</Label>
                        <ImageUpload
                            onUpload={(url) => onUpdate({ imageUrl: url })}
                            defaultImage={activity.imageUrl}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
