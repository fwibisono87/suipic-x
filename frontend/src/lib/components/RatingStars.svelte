<script lang="ts">
    import Star from "carbon-icons-svelte/lib/Star.svelte";
    import StarFilled from "carbon-icons-svelte/lib/StarFilled.svelte";
    import { createEventDispatcher } from "svelte";

    export let rating: number = 0;
    export let maxRating: number = 5;
    export let readonly: boolean = false;
    export let size: number = 24;

    const dispatch = createEventDispatcher<{ change: number }>();

    let hoverRating: number | null = null;

    function handleClick(value: number) {
        if (readonly) return;
        rating = rating === value ? 0 : value; // Allow toggling off
        dispatch("change", rating);
    }

    function handleMouseEnter(value: number) {
        if (!readonly) hoverRating = value;
    }

    function handleMouseLeave() {
        hoverRating = null;
    }

    $: displayRating = hoverRating ?? rating;
</script>

<div class="rating-stars" class:readonly role="group" aria-label="Rating">
    {#each Array(maxRating) as _, i}
        {@const value = i + 1}
        {@const filled = value <= displayRating}
        <button
            type="button"
            class="star"
            class:filled
            class:hovering={hoverRating !== null && value <= hoverRating}
            disabled={readonly}
            on:click={() => handleClick(value)}
            on:mouseenter={() => handleMouseEnter(value)}
            on:mouseleave={handleMouseLeave}
            aria-label="{value} star{value !== 1 ? 's' : ''}"
        >
            <svelte:component this={filled ? StarFilled : Star} {size} />
        </button>
    {/each}
</div>

<style lang="scss">
    .rating-stars {
        display: inline-flex;
        gap: 0.25rem;

        &.readonly {
            pointer-events: none;
        }
    }

    .star {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem;
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.15s ease-out;
        border-radius: 4px;

        &:hover:not(:disabled) {
            transform: scale(1.15);
        }

        &.filled {
            color: #f59e0b; // Amber
        }

        &.hovering {
            color: #fbbf24;
        }

        &:disabled {
            cursor: default;
        }

        &:focus-visible {
            outline: 2px solid var(--primary-500);
            outline-offset: 2px;
        }
    }
</style>
