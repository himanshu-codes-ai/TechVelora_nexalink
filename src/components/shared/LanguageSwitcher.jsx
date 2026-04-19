import React from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    function handleChange(e) {
        const lang = e.target.value;
        i18n.changeLanguage(lang);
        localStorage.setItem("appLanguage", lang);
    }

    return (
        <select
            value={i18n.language}
            onChange={handleChange}
            style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #d0d7de",
                background: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer"
            }}
        >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="mr">मराठी</option>
        </select>
    );
}