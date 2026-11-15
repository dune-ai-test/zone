package com.zone.desk.domain

import com.zone.desk.data.model.TaskChild
import com.zone.desk.data.model.TaskItem
import com.zone.desk.util.ZoneIds

data class TemplateItem(val text: String, val children: List<String> = emptyList())

data class ListTemplate(
    val id: String,
    val name: String,
    val kind: String,
    val hint: String,
    val items: List<TemplateItem>
)

object ListTemplates {
    val all = listOf(
        ListTemplate(
            id = "blank",
            name = "Blank page",
            kind = "other",
            hint = "Start with one line.",
            items = emptyList()
        ),
        ListTemplate(
            id = "weekend",
            name = "Weekend reset",
            kind = "home",
            hint = "The house, back to zero.",
            items = listOf(
                TemplateItem("Laundry and bedding", listOf("Strip the bed", "Wash the curtains", "Fold everything")),
                TemplateItem("Grocery run", listOf("Oats and coffee", "Olive oil", "Something green")),
                TemplateItem("Clean the desk properly"),
                TemplateItem("Water the balcony plants"),
                TemplateItem("Plan the week, not the month")
            )
        ),
        ListTemplate(
            id = "trip",
            name = "Trip packing",
            kind = "trip",
            hint = "Everything you will forget.",
            items = listOf(
                TemplateItem("Passport and tickets", listOf("Check the expiry date", "Save the boarding passes", "Download an offline map")),
                TemplateItem("Clothes", listOf("Layers", "Walking shoes", "Rain shell")),
                TemplateItem("Toiletries", listOf("Sunscreen", "Prescriptions", "Toothbrush")),
                TemplateItem("Devices and cables", listOf("Charger", "Power bank", "Travel adapter")),
                TemplateItem("Before leaving", listOf("Water the plants", "Take out the bins", "Lock the windows"))
            )
        ),
        ListTemplate(
            id = "launch",
            name = "Launch checklist",
            kind = "work",
            hint = "The last ten percent.",
            items = listOf(
                TemplateItem("Copy review", listOf("Headline and deck", "Pricing page")),
                TemplateItem("Mobile pass", listOf("Small phone (375px)", "Large phone, landscape")),
                TemplateItem("Analytics events", listOf("Signup completion", "Pricing click-through")),
                TemplateItem("Social cards"),
                TemplateItem("Send the preview to Priya")
            )
        ),
        ListTemplate(
            id = "groceries",
            name = "Grocery run",
            kind = "grocery",
            hint = "The ordinary essentials.",
            items = listOf(
                TemplateItem("Produce", listOf("Something green", "Fruit for the week", "Lemons")),
                TemplateItem("Pantry", listOf("Oats", "Coffee", "Olive oil")),
                TemplateItem("Cold", listOf("Milk", "Yoghurt")),
                TemplateItem("Home", listOf("Dish soap", "Paper towels"))
            )
        ),
        ListTemplate(
            id = "reading",
            name = "Reading queue",
            kind = "reading",
            hint = "A shelf with intent.",
            items = listOf(
                TemplateItem("The Creative Act \u2014 Rick Rubin"),
                TemplateItem("Slow Productivity \u2014 Cal Newport"),
                TemplateItem("The Shape of Design \u2014 Frank Chimero"),
                TemplateItem("Ways of Seeing \u2014 John Berger"),
                TemplateItem("A book chosen purely by its cover")
            )
        )
    )

    fun byId(id: String): ListTemplate = all.firstOrNull { it.id == id } ?: all.first()

    fun buildItems(template: ListTemplate): List<TaskItem> =
        template.items.map { item ->
            TaskItem(
                id = ZoneIds.uid("li"),
                text = item.text,
                done = false,
                children = item.children.map { child ->
                    TaskChild(id = ZoneIds.uid("lc"), text = child, done = false)
                }
            )
        }
}

object HabitStarters {
    val all = listOf(
        "Morning walk",
        "Read 20 pages",
        "Strength training",
        "Evening journal",
        "Stretch before bed",
        "Drink two litres of water",
        "No phone before nine",
        "Practise an instrument"
    )
}
