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