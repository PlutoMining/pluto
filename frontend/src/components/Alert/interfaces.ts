/**
 * Copyright (C) 2024 Alberto Gangarossa.
 * Pluto is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, version 3.
 * See <https://www.gnu.org/licenses/>.
*/

export enum AlertStatus {
    SUCCESS = "success",
    ERROR = "error",
    WARNING = "warning",
}

export interface AlertInterface {
    status: AlertStatus;
    title: string;
    message: string;
}

export interface AlertProps {
    content: AlertInterface;
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}