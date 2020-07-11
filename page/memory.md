---
layout: default
permalink: /memory/
---


<div class="post-container timeline_wrap">
    <h1 id="posts-label">timeline</h1>
    {% assign memory_by_year = site.memory | group_by_exp: "item","item.date|date: '%Y'" | sort: "name" | reverse %}

    {%- for year in memory_by_year -%}
    <article>
        <fieldset>
            <legend><h3>{{ year.name }}年</h3></legend>

            {% assign memory_sort = year.items | sort: 'date' | reverse %}
            {%- for item in memory_sort -%}
            <section>
                <span class="point-time"></span>
                <aside>
                    <p>{{item.location}} [<time datetime="{{item.date}}">{{item.date | date: '%Y-%-m-%-d'}}</time>]</p>
                    <div class="brief">{{item.content}}</div>
                </aside>
            </section>
            {%- endfor -%}
        </fieldset>


    </article>

    {%- endfor -%}
</div>