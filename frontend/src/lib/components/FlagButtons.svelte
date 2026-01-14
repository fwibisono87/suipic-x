<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Checkmark from "carbon-icons-svelte/lib/Checkmark.svelte";
    import Close from "carbon-icons-svelte/lib/Close.svelte";
    import Subtract from "carbon-icons-svelte/lib/Subtract.svelte";
    import type { EFlagType } from "$types";

    export let flag: EFlagType = "none";
    export let readonly: boolean = false;
    export let size: "sm" | "md" | "lg" = "md";

    const dispatch = createEventDispatcher<{ change: EFlagType }>();

    const iconSize = {
        sm: 16,
        md: 20,
        lg: 24,
    };

    function handleClick(value: EFlagType) {
        if (readonly) return;
        flag = flag === value ? "none" : value;
        dispatch("change", flag);
    }
</script>

<div
    class="flag-buttons size-{size}"
    class:readonly
    role="group"
    aria-label="Pick or reject"
>
    <button
        type="button"
        class="flag-btn pick"
        class:active={flag === "pick"}
        disabled={readonly}
        on:click={() => handleClick("pick")}
        aria-label="Pick"
        aria-pressed={flag === "pick"}
    >
        <Checkmark size={iconSize[size]} />
        {#if size !== "sm"}
            <span>Pick</span>
        {/if}
    </button>

    <button
        type="button"
        class="flag-btn none"
        class:active={flag === "none"}
        disabled={readonly}
        on:click={() => handleClick("none")}
        aria-label="Unflag"
        aria-pressed={flag === "none"}
    >
        <Subtract size={iconSize[size]} />
        {#if size !== "sm"}
            <span>Unflag</span>
        {/if}
    </button>

    <button
        type="button"
        class="flag-btn reject"
        class:active={flag === "reject"}
        disabled={readonly}
        on:click={() => handleClick("reject")}
        aria-label="Reject"
        aria-pressed={flag === "reject"}
    >
        <Close size={iconSize[size]} />
        {#if size !== "sm"}
            <span>Reject</span>
        {/if}
    </button>
</div>

<style lang="scss">
    .flag-buttons {
        display: inline-flex;
        gap: 0.5rem;

        &.readonly {
            pointer-events: none;
            opacity: 0.7;
        }

        &.size-sm {
            gap: 0.25rem;
        }
    }

    .flag-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        font-weight: 500;
        background-color: var(--surface-default);
        color: var(--text-secondary);
        border: 1px solid var(--border-default);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease-out;

        .size-sm & {
            padding: 0.375rem;
        }

        &:hover:not(:disabled) {
            border-color: var(--border-emphasized);
        }

        &:disabled {
            cursor: default;
        }

        // Pick - Green
        &.pick {
            &:hover:not(:disabled) {
                color: #10b981;
                border-color: rgba(16, 185, 129, 0.5);
                background-color: rgba(16, 185, 129, 0.1);
            }

            &.active {
                color: white;
                background-color: #10b981;
                border-color: #10b981;
            }
        }

        // None - Neutral
        &.none {
            &.active {
                color: var(--text-primary);
                background-color: var(--bg-muted);
                border-color: var(--border-emphasized);
            }
        }

        // Reject - Red
        &.reject {
            &:hover:not(:disabled) {
                color: #ef4444;
                border-color: rgba(239, 68, 68, 0.5);
                background-color: rgba(239, 68, 68, 0.1);
            }

            &.active {
                color: white;
                background-color: #ef4444;
                border-color: #ef4444;
            }
        }

        &:focus-visible {
            outline: 2px solid var(--primary-500);
            outline-offset: 2px;
        }
    }
</style>
