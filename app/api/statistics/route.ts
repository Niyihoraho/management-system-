
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // specific permissions check if needed, for now assuming authenticated users can view stats
        // or restrict to admin/national/region roles

        const regions = await prisma.region.findMany({
            include: {
                university: {
                    include: {
                        gbuData: {
                            orderBy: { year: 'desc' },
                            take: 1
                        }
                    }
                },
                report_submission: {
                    include: {
                        strategic_priority: true,
                        evaluation_response: {
                            include: {
                                evaluation_question: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        }) as any[];

        const pillars = await prisma.strategic_priority.findMany() as any[];

        const stats = regions.map(region => {
            // Aggregate GBU Data
            let activeMembers = 0;
            let cells = 0;
            let discipleshipGroups = 0;
            let studentsInDiscipleship = 0;
            let joinedThisYear = 0;
            let savedStudents = 0;

            const universityStats = region.university.map((uni: any) => {
                const latestData = uni.gbuData[0] || {};
                const uniMembers = latestData.activeMembers || 0;
                const uniCells = latestData.cells || 0;
                const uniGroups = latestData.discipleshipGroups || 0;
                const uniStudents = latestData.studentsInDiscipleship || 0;
                const uniJoined = latestData.joinedThisYear || 0;
                const uniSaved = latestData.savedStudents || 0;

                activeMembers += uniMembers;
                cells += uniCells;
                discipleshipGroups += uniGroups;
                studentsInDiscipleship += uniStudents;
                joinedThisYear += uniJoined;
                savedStudents += uniSaved;

                return {
                    id: uni.id,
                    name: uni.name,
                    activeMembers: uniMembers,
                    cells: uniCells,
                    discipleshipGroups: uniGroups,
                    studentsInDiscipleship: uniStudents,
                    joinedThisYear: uniJoined,
                    savedStudents: uniSaved,
                };
            });

            // Calculate Pillar Grades
            // Logic: For each pillar, find the most recent report.
            // Then calculate the average score of evaluations for that pillar.
            const pillarGrades: Record<string, string> = {};

            pillars.forEach(pillar => {
                // Find reports for this pillar in this region
                // We might want the LATEST report for this pillar
                const latestReport = region.report_submission.find((r: any) => r.priorityId === pillar.id);

                if (latestReport && latestReport.evaluation_response.length > 0) {
                    // Calculate Score
                    // MaturityLevel enum: NA_OR_NOT_SURE, NOT_EVIDENT, BEGINNING, GROWING, MATURING
                    // Map to 0-4?
                    // NA_OR_NOT_SURE -> ignore
                    // NOT_EVIDENT -> 1
                    // BEGINNING -> 2
                    // GROWING -> 3
                    // MATURING -> 4

                    let totalScore = 0;
                    let count = 0;

                    latestReport.evaluation_response.forEach((evalResponse: any) => {
                        let score = 0;
                        switch (evalResponse.rating) {
                            case "MATURING": score = 4; break;
                            case "GROWING": score = 3; break;
                            case "BEGINNING": score = 2; break;
                            case "NOT_EVIDENT": score = 1; break;
                            default: score = 0; // NA
                        }

                        if (score > 0) {
                            totalScore += score;
                            count++;
                        }
                    });

                    if (count > 0) {
                        const avg = totalScore / count;
                        // Map Avg to Grade
                        if (avg >= 3.5) pillarGrades[pillar.id] = "A";
                        else if (avg >= 2.5) pillarGrades[pillar.id] = "B";
                        else if (avg >= 1.5) pillarGrades[pillar.id] = "C";
                        else pillarGrades[pillar.id] = "D";
                    } else {
                        pillarGrades[pillar.id] = "-";
                    }
                } else {
                    pillarGrades[pillar.id] = "-";
                }
            });

            return {
                id: region.id,
                name: region.name,
                activeMembers,
                cells,
                discipleshipGroups,
                studentsInDiscipleship,
                joinedThisYear,
                savedStudents,
                universityStats,
                pillarGrades
            };
        });

        return NextResponse.json({ pillars, stats });

    } catch (error) {
        console.error("[STATISTICS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
