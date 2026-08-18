export const LANGS = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
] as const;

export type LangCode = (typeof LANGS)[number]["code"];

const DICT: Record<string, Record<LangCode, string>> = {
  "Home": { en: "Home", ar: "الرئيسية", zh: "首页", fr: "Accueil" },
  "My Applications": { en: "My Applications", ar: "طلباتي", zh: "我的申请", fr: "Mes candidatures" },
  "Programs": { en: "Programs", ar: "البرامج", zh: "课程项目", fr: "Programmes" },
  "Users": { en: "Users", ar: "المستخدمون", zh: "用户", fr: "Utilisateurs" },
  "Scholarships": { en: "Scholarships", ar: "المنح", zh: "奖学金", fr: "Bourses" },
  "Short Courses": { en: "Short Courses", ar: "دورات قصيرة", zh: "短期课程", fr: "Cours courts" },
  "Search": { en: "Search", ar: "بحث", zh: "搜索", fr: "Recherche" },
  "Application": { en: "Application", ar: "الطلب", zh: "申请管理", fr: "Candidature" },
  "Sub Agencies": { en: "Sub Agencies", ar: "الوكالات الفرعية", zh: "子代理机构", fr: "Sous-agences" },
  "Partner Commissions": { en: "Partner Commissions", ar: "عمولات الشركاء", zh: "合作伙伴佣金", fr: "Commissions partenaires" },
  "Transaction": { en: "Transaction", ar: "المعاملات", zh: "交易", fr: "Transactions" },
  "Documents": { en: "Documents", ar: "المستندات", zh: "文件", fr: "Documents" },
  "Reports": { en: "Reports", ar: "التقارير", zh: "报表", fr: "Rapports" },
  "Visitor Form": { en: "Visitor Form", ar: "نموذج الزائر", zh: "访客表单", fr: "Formulaire visiteur" },
  "My Shortlist": { en: "My Shortlist", ar: "مختاراتي", zh: "我的收藏", fr: "Ma sélection" },
  "My Documents": { en: "My Documents", ar: "مستنداتي", zh: "我的文件", fr: "Mes documents" },
  "Messages": { en: "Messages", ar: "الرسائل", zh: "消息", fr: "Messages" },
  "Payments": { en: "Payments", ar: "المدفوعات", zh: "支付", fr: "Paiements" },
  "Profile": { en: "Profile", ar: "الملف الشخصي", zh: "个人资料", fr: "Profil" },
  "Settings": { en: "Settings", ar: "الإعدادات", zh: "设置", fr: "Paramètres" },
  "Super Admin": { en: "Super Admin", ar: "مدير النظام", zh: "超级管理员", fr: "Super administrateur" },
  "Manager": { en: "Manager", ar: "مدير", zh: "经理", fr: "Gestionnaire" },
  "Agency": { en: "Agency", ar: "وكالة", zh: "代理机构", fr: "Agence" },
  "Counselor": { en: "Counselor", ar: "مستشار", zh: "顾问", fr: "Conseiller" },
  "Student": { en: "Student", ar: "طالب", zh: "学生", fr: "Étudiant" },
  "StudyAbroad": { en: "StudyAbroad", ar: "الدراسة بالخارج", zh: "海外留学", fr: "StudyAbroad" },
  "WhatsApp quick launch": { en: "WhatsApp quick launch", ar: "فتح واتساب", zh: "WhatsApp 快捷方式", fr: "Lancer WhatsApp" },
  "Sign out": { en: "Sign out", ar: "تسجيل الخروج", zh: "退出登录", fr: "Se déconnecter" },
  "Toggle theme": { en: "Toggle theme", ar: "تبديل السمة", zh: "切换主题", fr: "Changer de thème" },
};

export function translate(lang: LangCode, key: string): string {
  return DICT[key]?.[lang] ?? key;
}

export function dirForLang(lang: LangCode): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}