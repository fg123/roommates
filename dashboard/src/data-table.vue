<template>
    <div class="mdc-data-table">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'mdc-data-table'
}
</script>

<style>
div.mdc-data-table {
    box-shadow:
        0 3px 1px -2px rgba(0, 0, 0, 0.2),
        0 2px 2px 0 rgba(0, 0, 0, 0.14),
        0 1px 5px 0 rgba(0, 0, 0, 0.12);
    color: rgba(0, 0, 0, 0.87) !important;
    overflow-x: scroll;
}

div.mdc-data-table table tbody tr.disabled {
    color: #999!important;
}

div.mdc-data-table table {
    width: 100%;
    border-collapse: collapse;
    word-break: break-word;
    min-width: 900px;
}

div.mdc-data-table table tr:first-child,
div.mdc-data-table table tr:nth-last-child(n + 2) {
    border-bottom: 1px solid #e0e0e0;
}

div.mdc-data-table table td,
div.mdc-data-table table th {
    text-align: left;
    padding: 12px 24px;
    vertical-align: middle;
}

div.mdc-data-table table td.right,
div.mdc-data-table table th.right {
    text-align: right;
}

div.mdc-data-table table td {
    font-size: 14px;
}

div.mdc-data-table table th {
    font-size: 13px;
    line-height: 17px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    color: rgba(0, 0, 0, 0.54) !important;
}
</style>
