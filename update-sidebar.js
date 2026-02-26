const fs = require('fs');
let content = fs.readFileSync('app/components/app-sidebar.tsx', 'utf8');

const target = `{
                                        title: "General Information",
                                        url: "/links/organization/gbu-data",
                                        pro: false,
                                    },`;

const replacement = `{
                                        title: "General Information",
                                        url: "/links/organization/gbu-data",
                                        pro: false,
                                    },
                                    {
                                        title: "Campus Information",
                                        url: "/links/organization/campus-data",
                                        pro: false,
                                    },`;

content = content.replaceAll(target, replacement);

fs.writeFileSync('app/components/app-sidebar.tsx', content);
console.log("Updated app-sidebar.tsx successfully");
