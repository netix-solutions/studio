'use client';

import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    AD_WORKFLOW_STEPS,
    AD_STATUS_CUSTOMER_LABELS,
    getWorkflowStepNumber,
    isWorkflowComplete,
    type AdStatus
} from '@/lib/types';

interface WorkflowProgressProps {
    currentStatus: AdStatus;
    className?: string;
}

export function WorkflowProgress({ currentStatus, className }: WorkflowProgressProps) {
    const currentStep = getWorkflowStepNumber(currentStatus);
    const isComplete = isWorkflowComplete(currentStatus);

    return (
        <div className={cn("w-full", className)}>
            {/* Mobile: Vertical layout */}
            <div className="md:hidden space-y-3">
                {AD_WORKFLOW_STEPS.map((step, index) => {
                    const stepNum = index + 1;
                    const isStepComplete = currentStep > stepNum || isComplete;
                    const isCurrentStep = currentStep === stepNum && !isComplete;
                    const isPending = currentStep < stepNum;

                    return (
                        <div key={step.id} className="flex items-center gap-3">
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0 transition-all",
                                isStepComplete && "bg-green-500 border-green-500 text-white",
                                isCurrentStep && "bg-primary border-primary text-primary-foreground",
                                isPending && "bg-muted border-muted-foreground/30 text-muted-foreground"
                            )}>
                                {isStepComplete ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <span className="text-sm font-semibold">{stepNum}</span>
                                )}
                            </div>
                            <div>
                                <p className={cn(
                                    "text-sm font-medium",
                                    isCurrentStep && "text-primary",
                                    isStepComplete && "text-green-600",
                                    isPending && "text-muted-foreground"
                                )}>
                                    {step.title}
                                </p>
                                <p className="text-xs text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop: Horizontal layout */}
            <div className="hidden md:block">
                <div className="flex items-center justify-between">
                    {AD_WORKFLOW_STEPS.map((step, index) => {
                        const stepNum = index + 1;
                        const isStepComplete = currentStep > stepNum || isComplete;
                        const isCurrentStep = currentStep === stepNum && !isComplete;
                        const isPending = currentStep < stepNum;

                        return (
                            <div key={step.id} className="flex flex-col items-center text-center flex-1">
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                                    isStepComplete && "bg-green-500 border-green-500 text-white",
                                    isCurrentStep && "bg-primary border-primary text-primary-foreground",
                                    isPending && "bg-muted border-muted-foreground/30 text-muted-foreground"
                                )}>
                                    {isStepComplete ? (
                                        <CheckCircle className="h-5 w-5" />
                                    ) : (
                                        <span className="font-semibold">{stepNum}</span>
                                    )}
                                </div>
                                <p className={cn(
                                    "mt-2 text-sm font-medium",
                                    isCurrentStep && "text-primary",
                                    isStepComplete && "text-green-600",
                                    isPending && "text-muted-foreground"
                                )}>
                                    {step.title}
                                </p>
                            </div>
                        );
                    })}
                </div>
                {/* Progress bar */}
                <div className="mt-3 relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className="absolute h-full bg-green-500 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(100, ((currentStep - 1) / (AD_WORKFLOW_STEPS.length - 1)) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

interface WorkflowStatusBannerProps {
    currentStatus: AdStatus;
    className?: string;
}

export function WorkflowStatusBanner({ currentStatus, className }: WorkflowStatusBannerProps) {
    const label = AD_STATUS_CUSTOMER_LABELS[currentStatus] || currentStatus;
    const stepNumber = getWorkflowStepNumber(currentStatus);
    const isComplete = isWorkflowComplete(currentStatus);

    const getBgColor = () => {
        if (currentStatus === 'live') return 'bg-green-50 border-green-200';
        if (currentStatus === 'approved') return 'bg-indigo-50 border-indigo-200';
        if (currentStatus === 'customer_approval') return 'bg-amber-50 border-amber-200';
        if (currentStatus === 'in_review') return 'bg-blue-50 border-blue-200';
        if (currentStatus === 'canceled') return 'bg-red-50 border-red-200';
        if (currentStatus === 'completed') return 'bg-teal-50 border-teal-200';
        return 'bg-muted border-border';
    };

    return (
        <div className={cn(
            "rounded-lg border-2 p-4 text-center",
            getBgColor(),
            className
        )}>
            <p className="text-lg font-semibold">{label}</p>
            {!isComplete && (
                <p className="text-sm text-muted-foreground mt-1">
                    Step {stepNumber} of {AD_WORKFLOW_STEPS.length}
                </p>
            )}
        </div>
    );
}
